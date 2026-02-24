const MIN_RESULTS_PER_CATEGORY = 1;

const RELAXATION_STEPS = [
  {},                                                                        // Pass 0: strict
  { relaxCity: true },                                                       // Pass 1
  { relaxCity: true, relaxState: true },                                    // Pass 2
  { relaxCity: true, relaxState: true, useCluster: true },                  // Pass 3
  { relaxCity: true, relaxState: true, useCluster: true, relaxObjective: true }, // Pass 4
];

/**
 * Run matching with progressive relaxation.
 * Calls runMatchFn with each relaxation step until enough results are found.
 *
 * @param {Function} runMatchFn - async (relaxOpts) => { athletes, leagues, venues }
 * @returns {{ results, relaxationsApplied, relaxationPass, isRelaxed }}
 */
async function runWithRelaxation(runMatchFn) {
  for (let i = 0; i < RELAXATION_STEPS.length; i++) {
    const relaxOpts = RELAXATION_STEPS[i];
    const results = await runMatchFn(relaxOpts);

    const hasEnough =
      results.athletes.length >= MIN_RESULTS_PER_CATEGORY ||
      results.leagues.length  >= MIN_RESULTS_PER_CATEGORY ||
      results.venues.length   >= MIN_RESULTS_PER_CATEGORY;

    if (hasEnough || i === RELAXATION_STEPS.length - 1) {
      return {
        results,
        relaxationsApplied: relaxOpts,
        relaxationPass: i,
        isRelaxed: i > 0,
      };
    }
  }
}

module.exports = { runWithRelaxation };
