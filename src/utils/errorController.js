import AppError from '../utils/appError.js'

// Mongoose cast error
const handleCastError = err => {
    const message = `Invalid ${err.path}: ${err.value}.`
    return new AppError(message, 400)
}

// Mongoose duplicate error
const handleDuplicateError = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0] // duplicate name is between two quotes in mongoose
    const message = `Duplicate field value ${value}. Please use another value.`
    return new AppError(message, 400)
}

// Mongoose validation error
const handleValidationError = err => {
    const errors = Object.values(err.errors).map(e => e.message)
    const message = `Invalid input data. ${errors.join('. ')}`
    return new AppError(message, 400)
}

// JwtWebToken
const handleJwtWebTokenError = () => new AppError('Invalid token. Pleae login again.', 401)
const handleJwtExpiredError = () => new AppError('Your token has expired. Please login again.', 401)

const sendErrorDevelopment = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    })
}

const sendErrorProduction = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        })
    } else { // Programming or other unknown error: don't leak error details to the client
        // 1) Log error
        // console.error('ERROR 🔥', err)

        // 2) Send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong.'
        })
    }
}


// Error middleware
// next(error) -> error object is passed to next function and express is automaticallly calls this middleware to handle the error
const errorController = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'
    if (process.env.NODE_ENV === 'development') sendErrorDevelopment(err, res)
    else if (process.env.NODE_ENV === 'production') {
        let error = { ...err, name: err.name, isOperational: err.isOperational, message: err.message }

        if (error.name === 'CastError') error = handleCastError(error)
        if (error.code === 11000) error = handleDuplicateError(error)
        if (error.name === 'ValidationError') error = handleValidationError(error)
        if (error.name === 'JsonWebTokenError') error = handleJwtWebTokenError()
        if (error.name === 'TokenExpiredError') error = handleJwtExpiredError()

        sendErrorProduction(error, res)
    }
}

export default errorController