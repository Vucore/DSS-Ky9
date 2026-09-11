import { Dataset, Step1Output, Step2Output, TimeSlot, CalculationTraceMeta } from '../domain/types';
import { toMathId, cleanEntityName } from '../domain/notationRegistry';

/**
 * Step 2: User Time Preference Model Construction
 * Implements Equations (4), (5), and (6) from Section 3.3 (2) of the paper.
 * 
 * Time slots:
 * T1: 7-12h (morning)
 * T2: 13-18h (afternoon)
 * T3: 19-24h (evening, 19-23)
 * T4: 1-6h (night, 0-6)
 * T5: Weekend ratio = weekend_visits / total_visits
 * 
 * Mu = (Mc_u, Mt_u)
 */

export function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 7 && hour <= 12) return 'T1';
  if (hour >= 13 && hour <= 18) return 'T2';
  if (hour >= 19 && hour <= 23) return 'T3';
  return 'T4'; // 0 - 6
}

export function computeTimePreferences(dataset: Dataset, step1Output: Step1Output): Step2Output {
  const { users, checkIns, categories } = dataset;

  const timePreferences: Step2Output['timePreferences'] = {};
  const userVectors: Step2Output['userVectors'] = {};

  const featureNames = [
    ...categories.map((c) => `Thể loại ${toMathId(c.id)}: ${cleanEntityName(c.name)}`),
    'Thời gian T_1: Sáng (07-12h)',
    'Thời gian T_2: Chiều (13-18h)',
    'Thời gian T_3: Tối (19-24h)',
    'Thời gian T_4: Đêm (01-06h)',
    'Thời gian T_5: Tỷ lệ cuối tuần'
  ];

  for (const user of users) {
    const userCheckIns = checkIns.filter((ck) => ck.userId === user.id);
    const slotCounts: Record<TimeSlot, number> = {
      T1: 0,
      T2: 0,
      T3: 0,
      T4: 0
    };
    let weekendCount = 0;

    for (const ck of userCheckIns) {
      const slot = getTimeSlot(ck.hour);
      slotCounts[slot] += 1;
      if (ck.dayOfWeek === 0 || ck.dayOfWeek === 6) {
        weekendCount += 1;
      }
    }

    const totalSlotVisits = slotCounts.T1 + slotCounts.T2 + slotCounts.T3 + slotCounts.T4;
    const totalVisits = userCheckIns.length;

    const traces: Record<'T1' | 'T2' | 'T3' | 'T4' | 'T5', CalculationTraceMeta> = {} as any;
    const slots: TimeSlot[] = ['T1', 'T2', 'T3', 'T4'];
    const timeVector: number[] = [];

    // T1 - T4
    for (const slot of slots) {
      const count = slotCounts[slot];
      const p_tk = totalSlotVisits > 0 ? count / totalSlotVisits : 0;
      timeVector.push(p_tk);

      const slotMath = toMathId(slot).toLowerCase();
      const uMath = toMathId(user.id);
      const expressionLatex = totalSlotVisits > 0
        ? `p_{${uMath}, ${slotMath}} = \\frac{${count}}{${totalSlotVisits}} = ${p_tk.toFixed(4)}`
        : `p_{${uMath}, ${slotMath}} = 0`;

      traces[slot] = {
        formulaNumber: 'Công thức (4)',
        formulaLatex: `p_{u, ${slotMath}} = \\frac{n_{u, ${slotMath}}}{\\sum_{k=1}^4 n_{u, t_k}}`,
        expression: totalSlotVisits > 0
          ? `${count} / ${totalSlotVisits} = ${p_tk.toFixed(4)}`
          : `0 / 0 = 0`,
        expressionLatex,
        inputs: {
          slot,
          visitCountInSlot: count,
          totalTimeSlotVisits: totalSlotVisits
        },
        numerator: count,
        denominator: totalSlotVisits,
        value: p_tk
      };
    }

    // T5: weekend ratio
    const p_t5 = totalVisits > 0 ? weekendCount / totalVisits : 0;
    timeVector.push(p_t5);

    const uMath = toMathId(user.id);
    const expressionLatexT5 = totalVisits > 0
      ? `p_{${uMath}, t_5} = \\frac{${weekendCount}}{${totalVisits}} = ${p_t5.toFixed(4)}`
      : `p_{${uMath}, t_5} = 0`;

    traces.T5 = {
      formulaNumber: 'Công thức (4)',
      formulaLatex: `p_{u, t_5} = \\frac{n_{u, \\text{cuối tuần}}}{\\sum_{k=1}^4 n_{u, t_k}}`,
      expression: totalVisits > 0
        ? `${weekendCount} / ${totalVisits} = ${p_t5.toFixed(4)}`
        : `0 / 0 = 0`,
      expressionLatex: expressionLatexT5,
      inputs: {
        weekendVisits: weekendCount,
        totalVisits
      },
      numerator: weekendCount,
      denominator: totalVisits,
      value: p_t5
    };

    timePreferences[user.id] = {
      slotCounts,
      weekendCount,
      totalSlotVisits,
      totalVisits,
      traces,
      vectorMt: timeVector
    };

    const categoryPart = step1Output.vectors[user.id] || [];
    const combinedMu = [...categoryPart, ...timeVector];

    userVectors[user.id] = {
      categoryPart,
      timePart: timeVector,
      combinedMu,
      featureNames
    };
  }

  return {
    timePreferences,
    userVectors
  };
}
