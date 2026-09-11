import { Dataset, Step1Output, CalculationTraceMeta } from '../domain/types';
import { toMathId } from '../domain/notationRegistry';

/**
 * Step 1: User Category Preference Model Construction
 * Implements Equation (2) and Equation (3) from Section 3.3 (1) of the paper.
 * 
 * Formula:
 * p_{u, c} = [ \sum_{k=1}^m r_{u, l_k} * f_{l_k, c} / \sum_{k=1}^m r_{u, l_k} ]
 *          * \log[ \sum_{k=1}^m \sum_{i=1}^|C| f_{l_k, c_i} / \sum_{k=1}^m f_{l_k, c} ]
 */
export function computeCategoryPreferences(dataset: Dataset): Step1Output {
  const { users, pois, categories, checkIns, hyperparameters } = dataset;
  const logBase = hyperparameters.logBase || 'ln';

  const logFn = (val: number): number => {
    if (val <= 0) return 0;
    if (logBase === 'log10') return Math.log10(val);
    if (logBase === 'log2') return Math.log2(val);
    return Math.log(val); // default ln
  };

  const logSymbol = logBase === 'log10' ? '\\log_{10}' : logBase === 'log2' ? '\\log_2' : '\\ln';

  // 1. Compute catalog IDF stats
  // Total category assignments across all locations
  const totalCategoryAssignments = pois.reduce((acc, poi) => acc + poi.categories.length, 0);

  // Frequency of each category across all POIs: sum_{k=1}^m f_{l_k, c}
  const categoryPoiCounts: Record<string, number> = {};
  for (const cat of categories) {
    categoryPoiCounts[cat.id] = pois.filter((poi) => poi.categories.includes(cat.id)).length;
  }

  // 2. Count check-ins per user per POI: r_{u, l_k}
  const userPoiCounts: Record<string, Record<string, number>> = {};
  const userTotalCheckIns: Record<string, number> = {};

  for (const u of users) {
    userPoiCounts[u.id] = {};
    userTotalCheckIns[u.id] = 0;
    for (const p of pois) {
      userPoiCounts[u.id][p.id] = 0;
    }
  }

  for (const ck of checkIns) {
    if (userPoiCounts[ck.userId] && userPoiCounts[ck.userId][ck.poiId] !== undefined) {
      userPoiCounts[ck.userId][ck.poiId] += 1;
      userTotalCheckIns[ck.userId] += 1;
    }
  }

  const preferences: Record<string, Record<string, CalculationTraceMeta>> = {};
  const vectors: Record<string, number[]> = {};
  const categoryIds = categories.map((c) => c.id);

  for (const user of users) {
    preferences[user.id] = {};
    const uVector: number[] = [];

    const totalUserCheckins = userTotalCheckIns[user.id];

    for (const cat of categories) {
      // Checkins of user u to locations belonging to category c: sum_{k=1}^m r_{u, l_k} * f_{l_k, c}
      let userCatCheckins = 0;
      for (const poi of pois) {
        if (poi.categories.includes(cat.id)) {
          userCatCheckins += userPoiCounts[user.id][poi.id] || 0;
        }
      }

      const tf = totalUserCheckins > 0 ? userCatCheckins / totalUserCheckins : 0;

      const catPoiCount = categoryPoiCounts[cat.id] || 0;
      const idfRatio = catPoiCount > 0 ? totalCategoryAssignments / catPoiCount : 1;
      const idf = catPoiCount > 0 ? logFn(idfRatio) : 0;

      const p_uc = tf * idf;
      uVector.push(p_uc);

      const expression = totalUserCheckins > 0 && catPoiCount > 0
        ? `(${userCatCheckins} / ${totalUserCheckins}) * ${logBase}(${totalCategoryAssignments} / ${catPoiCount}) = ${tf.toFixed(4)} * ${idf.toFixed(4)} = ${p_uc.toFixed(4)}`
        : `0 * 0 = 0`;

      const expressionLatex = totalUserCheckins > 0 && catPoiCount > 0
        ? `p_{${toMathId(user.id)}, ${toMathId(cat.id)}} = \\left( \\frac{${userCatCheckins}}{${totalUserCheckins}} \\right) \\times ${logSymbol}\\left( \\frac{${totalCategoryAssignments}}{${catPoiCount}} \\right) = ${tf.toFixed(4)} \\times ${idf.toFixed(4)} = ${p_uc.toFixed(4)}`
        : `p_{${toMathId(user.id)}, ${toMathId(cat.id)}} = 0 \\times 0 = 0`;

      preferences[user.id][cat.id] = {
        formulaNumber: 'Công thức (2)',
        formulaLatex: `p_{u, c} = \\frac{\\sum_{k=1}^m r_{u, l_k} f_{l_k, c}}{\\sum_{k=1}^m r_{u, l_k}} \\times ${logSymbol}\\left( \\frac{\\sum_{k=1}^m \\sum_{i=1}^{|C|} f_{l_k, c_i}}{\\sum_{k=1}^m f_{l_k, c}} \\right)`,
        expression,
        expressionLatex,
        inputs: {
          user: user.name,
          category: cat.name,
          userCatCheckins,
          totalUserCheckins,
          totalCategoryAssignments,
          catPoiCount
        },
        numerator: userCatCheckins,
        denominator: totalUserCheckins,
        intermediateValues: {
          tf,
          idfRatio,
          idf,
          logBase
        },
        value: p_uc
      };
    }

    vectors[user.id] = uVector;
  }

  return {
    preferences,
    vectors,
    categoryIds
  };
}
