import { describe, it, expect } from 'vitest';
import katex from 'katex';
import { NOTATIONS, toMathId, toMathSet, cleanEntityName } from '../domain/notationRegistry';

describe('Phase A: KaTeX Notation Registry Validation', () => {
  it('should parse all registry math symbols without throwing KaTeX errors', () => {
    for (const [, def] of Object.entries(NOTATIONS)) {
      expect(def.latex).toBeDefined();
      expect(def.latex.length).toBeGreaterThan(0);

      // Verify that katex.renderToString parses with throwOnError: true
      expect(() => {
        katex.renderToString(def.latex, { throwOnError: true });
      }).not.toThrow();
    }
  });

  it('should include all critical mathematical symbols required by the improvement plan', () => {
    expect(NOTATIONS.MuC.latex).toBe('M_u^C');
    expect(NOTATIONS.MuT.latex).toBe('M_u^T');
    expect(NOTATIONS.Mu.latex).toBe('M_u');
    expect(NOTATIONS.Mg.latex).toBe('M_g');
    expect(NOTATIONS.eta_u_g.latex).toBe('\\eta_u^g');
    expect(NOTATIONS.simM.latex).toBe('\\operatorname{sim}^m_{g, v}');
    expect(NOTATIONS.simU.latex).toBe('\\operatorname{sim}^u_{g, v}');
    expect(NOTATIONS.sim.latex).toBe('\\operatorname{sim}_{g, v}');
    expect(NOTATIONS.f_g_l.latex).toBe('f_{g, l}');
    expect(NOTATIONS.delta_u_l.latex).toBe('\\delta(u, l)');
    expect(NOTATIONS.d_g_l.latex).toBe('d_{g, l}');
    expect(NOTATIONS.f_prime_g_l.latex).toBe("f'_{g, l}");
    expect(NOTATIONS.L_candidate.latex).toBe('L_{\\text{candidate}}(g)');
  });

  it('should properly convert entity IDs (l1, c1, u1, T1, ck1) to subscripted KaTeX', () => {
    expect(toMathId('l1')).toBe('l_1');
    expect(toMathId('l2')).toBe('l_2');
    expect(toMathId('c1')).toBe('c_1');
    expect(toMathId('c3')).toBe('c_3');
    expect(toMathId('u1')).toBe('u_1');
    expect(toMathId('u5')).toBe('u_5');
    expect(toMathId('T1')).toBe('T_1');
    expect(toMathId('T5')).toBe('T_5');
    expect(toMathId('ck1')).toBe('\\text{ck}_{1}');

    // Verify each converted ID is valid KaTeX
    for (const id of ['l1', 'l2', 'c1', 'c2', 'u1', 'u2', 'T1', 'T2', 'ck1']) {
      const mathId = toMathId(id);
      expect(() => {
        katex.renderToString(mathId, { throwOnError: true });
      }).not.toThrow();
    }
  });

  it('should properly format sets as valid KaTeX', () => {
    const userSet = toMathSet(['u1', 'u2', 'u3']);
    expect(userSet).toBe('\\{u_1, u_2, u_3\\}');
    expect(() => katex.renderToString(userSet, { throwOnError: true })).not.toThrow();

    const poiSet = toMathSet(['l1', 'l2', 'l6']);
    expect(poiSet).toBe('\\{l_1, l_2, l_6\\}');
    expect(() => katex.renderToString(poiSet, { throwOnError: true })).not.toThrow();

    const emptySet = toMathSet([]);
    expect(emptySet).toBe('\\emptyset');
    expect(() => katex.renderToString(emptySet, { throwOnError: true })).not.toThrow();
  });

  it('should cleanly strip trailing entity ID parentheticals from names', () => {
    expect(cleanEntityName('Alice (u1)')).toBe('Alice');
    expect(cleanEntityName('Cà phê Blue Bottle (l1)')).toBe('Cà phê Blue Bottle');
    expect(cleanEntityName('Quán cà phê (c1)')).toBe('Quán cà phê');
    expect(cleanEntityName('Already Clean')).toBe('Already Clean');
  });
});
