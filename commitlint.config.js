/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // new feature
        'fix',      // bug fix
        'docs',     // documentation
        'style',    // formatting, no code change
        'refactor', // code change that is neither feat nor fix
        'perf',     // performance improvement
        'test',     // adding tests
        'chore',    // tooling, build, dependency updates
        'revert',   // revert previous commit
        'ci',       // CI configuration
        'build',    // build system changes
      ],
    ],
    'subject-case': [0],         // allow any case (more flexible)
    'subject-max-length': [2, 'always', 100],
  },
}
