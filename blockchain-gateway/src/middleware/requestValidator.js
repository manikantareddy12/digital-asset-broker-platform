/**
 * Request Validator Middleware
 * 
 * Custom validation helpers and middleware.
 */

import { validationResult } from 'express-validator';

/**
 * Middleware to check validation results
 */
export function checkValidation(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }

    next();
}

/**
 * Custom validator for bytes32 hex strings
 */
export function isBytes32(value) {
    if (typeof value !== 'string') return false;
    if (!value.startsWith('0x')) return false;
    if (value.length !== 66) return false;
    return /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Custom validator for wei amounts (positive big integers as strings)
 */
export function isWeiAmount(value) {
    if (typeof value !== 'string') return false;
    try {
        const bigVal = BigInt(value);
        return bigVal > 0n;
    } catch {
        return false;
    }
}

export const requestValidator = {
    checkValidation,
    isBytes32,
    isWeiAmount
};
