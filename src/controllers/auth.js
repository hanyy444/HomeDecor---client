import crypto from 'crypto'
import { promisify } from 'util'
import User from './user/user.model.js'
import catchAsync from '../../utils/catchAsync.js'

import jwt from 'jsonwebtoken'
import config from '../config.js'

import AppError from '../../utils/appError.js'

// import sendEmail from '../../utils/email.js'
import Email from '../../utils/email.js'

const { jwt_secret, jwt_expires_in, jwt_cookie_expires_in } = config.jwt


/**
 * A global object containing messages sent to the client
 */
const clientMessages = {
    success: 'success',
    missingLoginInfo: 'Please provide email and password.',
    incorrectLoginInfo: 'Incorrect email or password',
    missingToken: 'You are not logged in. Please login to have access.',
    userNolongerExists: 'User no longer exists.',
    userChangedPassword: 'User recently changed password. Please login again.',
    noPermission: 'You do not have permission to perform this action.',
    tokenSent: 'Token was sent to email',
    invalidOrExpiredToken: 'Token is invalid or has expired.',
    invalidEmail: 'There is no user with this email.',
    sendEmailError: 'There was an error sending the email. Please try again later.',
    invalidPassword: 'Password is incorrect'
}

const statusCodes = {
    created: 201,
    deleted: 204,
    badRequest: 400,
    unauthenticated: 401,
    unauthorized: 403,
    notFound: 404,
    tooManyRequests: 429,
    internalError: 500,
}

/**
 * Generate a jwt token with id as payload, jwt secret and expiry date
 * @param {ObjectId} id 
 * @returns {JsonWebToken} token 
 */
const signToken = id => jwt.sign({ id }, jwt_secret, { expiresIn: jwt_expires_in }) // payload, secret, expires-in


/**
 * Create a jwt token and sends the token to the passed user a cookie 
 * @param {object} user 
 * @param {number} statusCode 
 * @param {object} res - express response object
 */
const createSendToken = (user, statusCode, res) => {
    const { success } = clientMessages

    const token = signToken(user._id)

    const cookieExpiryTime = Date.now() + jwt_cookie_expires_in * 24 * 60 * 60 * 1000 // ( ms )

    const cookieOptions = {
        expires: new Date(cookieExpiryTime),
        httpOnly: true
    }

    // To be changed: watch deployment videos
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true

    // send a cookie
    res.cookie('jwt', token, cookieOptions)

    user.password = undefined

    res.status(statusCode).json({
        status: success,
        token,
        data: {
            user
        }
    })
}

/**
 * Sign up a user - creates a new one using data from body, send a welcome email & login the user
 * @async
 * @function
 */
export const signUp = catchAsync(async (req, res, next) => {

    const { name, email, password, confirmPassword } = req.body


    // 1) Create user
    const newUser = await User.create({
        name,
        email,
        password,
        confirmPassword
    })

    // 2) Send welcome email
    // const url = `${req.protocol}://${req.get('host')}/me`;
    // await new Email(newUser, url).sendWelcome()

    // 3) Login user
    createSendToken(newUser, 201, res)
})

/**
 * Login a user using data from body
 * @async
 * @function
 */
export const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body

    const { success, missingLoginInfo, incorrectLoginInfo } = clientMessages

    // 1) check if email and password exist
    if (!email || !password) return next(new AppError(missingLoginInfo, 400))

    // 2) check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password')

    if (!user || !(await user.correctPassword(password, user.password)))
        return next(new AppError(incorrectLoginInfo, 401))

    // 3) if ok, send token to client
    createSendToken(user, 200, res)
})

/**
 * Prevent unauthenticated users from accessing protected routes
 * @async
 * @function
 */
export const protect = catchAsync(async (req, res, next) => {

    const { missingToken, userNolongerExists, userChangedPassword } = clientMessages

    // 1) check if token exits and get it
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer'))
        token = req.headers.authorization.split(' ')[1]

    if (!token) return next(new AppError(missingToken, 401))

    // 2) verify token 
    const { id, iat: issuedAt } = await promisify(jwt.verify)(token, jwt_secret)

    // 3) check if user exists
    const freshUser = await User.findById(id)

    if (!freshUser) return next(new AppError(userNolongerExists, 404))

    // 4) check if user changed password after the token is issued
    if (freshUser.changedPasswordAfterIssuedToken(issuedAt))
        return next(new AppError(userChangedPassword, 401))

    // 5) grant access to protected route
    req.user = freshUser

    next()
})

/**
 * Restrict routes from unauthorized users by their roles allowing only the passed-in roles
 * @function
 * @param  {Array} roles 
 * @returns {Boolean}
 */
export const restrictTo = (...roles) => (req, res, next) => {
    const { noPermission } = clientMessages

    if (!roles.includes(req.user.role))
        return next(new AppError(noPermission, 403))

    req.restrictTo = roles

    next()
}

/**
 * Change user password and login them again
 * @async
 * @function
 */
export const changePassword = catchAsync(async (req, res, next) => {

    const { success, incorrectLoginInfo } = clientMessages
    const { email, password, newPassword, confirmNewPassword } = req.body

    // 1) get user 
    const user = await User.findOne({ _id: req.user._id, email }).select('+password')

    // 2) check if sent password is correct
    if (!user || !(await user.correctPassword(password, user.password)))
        return next(new AppError(incorrectLoginInfo, 400))

    // 3) update the password
    user.password = newPassword
    user.confirmPassword = confirmNewPassword
    await user.save();

    // 4) login user
    createSendToken(user, 200, res)
})

/**
 * Generate a reset token for user's forgotten password and send it via email
 * @async
 * @function
 */
export const forgotPassword = catchAsync(async (req, res, next) => {
    const { success, tokenSent, invalidEmail, sendEmailError } = clientMessages

    // 1) get user by email
    const user = await User.findOne({ email: req.body.email })

    if (!user) return next(new AppError(invalidEmail, 404))

    // 2) generate random reset token
    const resetToken = user.createPasswordResetToken()
    await user.save({ validateBeforeSave: false })

    // 3) send it to user's email
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`

    const message = `Forgot you password? Submit a PATCH request with your new password and confirmPassword to: ${resetUrl}.\n If you didn't forget your password, please ignore this email!`;

    try {

        // await sendEmail({
        //     email: user.email,
        //     subject: 'Your password reset token (valid only for 10mins)',
        //     message
        // })

        res.status(200).json({
            status: success,
            message: tokenSent
        })

    } catch (error) {
        user.passswordResetToken = undefined
        user.passwordResetExpires = undefined

        await user.save({ validateBeforeSave: false })

        return next(
            new AppError(sendEmailError, 500)
        )
    }
})

/**
 * Extract reset token from params, verify token and update user with the new password
 * @async
 * @function
 */
export const resetPassword = catchAsync(async (req, res, next) => {

    const { success, invalidOrExpiredToken } = clientMessages

    const { password, confirmPassword } = req.body

    // 1) Get user based on the token
    const encryptedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')

    const user = await User.findOne({
        passswordResetToken: encryptedToken,
        passwordResetExpires: { $gt: Date.now() }
    })

    if (!user) return next(new AppError(invalidOrExpiredToken, 400))

    // 2) If token has not expired, and there is user, set the new password
    user.password = password
    user.confirmPassword = confirmPassword
    user.passswordResetToken = undefined
    user.passwordResetExpires = undefined

    await user.save()

    // 3) Update changedPasswordAt for the user
    // 4) log the user in, send JWT
    createSendToken(user, 200, res)
})
