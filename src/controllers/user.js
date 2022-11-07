import User from "./models/user"
import catchAsync from "../utils/catchAsync"
import AppError from "../utils/appError"
import { getOne, getAll, updateOne, deleteOne, createOne } from './crud'
// import useMulter from '../utils/multer'

export const createUser = createOne(User)
export const getAllUsers = getAll(User)
export const getUser = getOne(User)
export const updateUser = updateOne(User)
export const deleteUser = deleteOne(User)

export const updateMe = catchAsync(async (req, res, next) => {

    const userId = req.user.id

    const { name, email } = req.body

    // 1) create error if user POSTed password
    if (req.body.password || req.body.confirmPassword)
        return next(new AppError('This route is note for password updates. Please use /changePassword', 400))

    let photo;
    if (req.file) photo = req.file.filename

    // 2) Update user document
    const user = await User.findByIdAndUpdate(userId, { name, email, photo }, { new: true, runValidators: true })

    res.status(200).json({
        status: 'success',
        user
    })
})

export const deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false })

    res.status(200).json({
        status: 'success',
        user: null
    })
})

// returns a midlle ware that appends file to req (req.file or req.files)
// export const uploadPhoto = useMulter('image').single('photo')
// export const uploadPhotos = useMulter('image').array('photos', 5)
// export const uploadMixedPhotos = useMulter('image').fields([
//     { name: 'imageCover', maxCount: 1 },
//     { name: 'images', maxCount: 3 }
// ])

// export const resizeImages = catchAsync(async (req, res, next) => {
//     const files = req.files

//     if (!req.files.imageCover || !req.files.images) return next()

//     // 1) cover image
//     const imageCoverFilename = ''
//     await sharp(req.files.imageCover[0].buffer)
//         .resize(2000, 1333)
//         .toFormat('jpeg')
//         .jpeg({ quality: 90 })
//         .toFile(`src/public/imgs/users/${imageCoverFilename}`)

//     next()
// })