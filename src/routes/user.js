import express from 'express'
import * as userController from "./user.controller.js";
import * as authController from '../authController.js'
import reviewRouter from "../review/review.router.js"

import { setUserParam, resizePhoto } from '../middlewares.js';
import catchAsync from '../../../utils/catchAsync.js';


const router = express.Router()

router.use('/:userId/reviews', reviewRouter)

const { updateMe,
    deleteMe,
    getAllUsers,
    createUser,
    getUser,
    updateUser,
    deleteUser, uploadPhoto } = userController

const { signUp, login, protect, restrictTo, changePassword, forgotPassword, resetPassword } = authController

router.post('/signup', signUp)

router.post('/login', login)

router.post('/forgotPassword', forgotPassword)
router.patch('/resetPassword/:token', resetPassword)


// NOTE: middleware runs in order
// use protection here will apply to all below routes
router.use(protect)

router.patch('/changePassword', changePassword)

router
    .route('/me')
    .get(setUserParam, getUser)
    .patch(uploadPhoto, resizePhoto, updateMe)
    .delete(deleteMe)

router.use(restrictTo('admin'))

router
    .route('/')
    .get(getAllUsers)
    .post(createUser)

router
    .route('/:userId')
    .get(getUser)
    .patch(updateUser)
    .delete(deleteUser)



export default router
