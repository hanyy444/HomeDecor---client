import multer from 'multer';

export const useMulter = (fileType) => {
    // Disk Storage
    // const multerStorage = multer.diskStorage({
    //     destination: (req, file, cb) => {
    //         cb(null, dest)
    //     },
    //     filename: (req, file, cb) => {
    //         const ext = file.mimetype.split('/')[1]
    //         cb(null, `user-${req.user.id}-${Date.now()}.${ext}`)
    //     }
    // })

    // Memory Storage
    const multerStorage = multer.memoryStorage()

    const multerFilter = (req, file, cb) => {
        if (file.mimetype.startsWith(fileType)) {
            cb(null, true)
        } else {
            cb(new AppError(`Not an ${fileType}. Please upload only images.`, 400), false)
        }
    }

    const upload = multer({
        storage: multerStorage,
        fileFilter: multerFilter
    })

    return upload
}

export default useMulter