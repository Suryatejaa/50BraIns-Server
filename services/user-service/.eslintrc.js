module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true
    },
    extends: ['eslint:recommended', 'airbnb-base'],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
    },
    rules: {
        'comma-dangle': ['error', 'never'],
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        'no-underscore-dangle': 'off',
        'max-len': ['error', { code: 120 }],
        'arrow-parens': ['error', 'as-needed'],
        'operator-linebreak': 'off',
        'implicit-arrow-linebreak': 'off',
        'function-paren-newline': 'off',
        'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.js', '**/*.spec.js'] }],
        'class-methods-use-this': 'off'
    }
};
