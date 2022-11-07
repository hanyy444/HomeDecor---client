import catchAsync from "../utils/catchAsync.js"
import APIFeatures from "../utils/apiFeatures.js"
import AppError from "../utils/appError.js"

export const getAll = Model => catchAsync(async (req, res, next) => {

    let filter = {}

    // TODO: with this filter anyone one can access resources related to specific user (hack)
    // because of nested routes as in (reviews)
    // this is Parent Referencing and it should be with other resource than user
    if (req.params.userId) filter = { user: req.user.id }

    const features = new APIFeatures(Model.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate()

    const data = await features.query

    return res.status(200).json({ status: 'success', count: data.length, data })
})

export const createOne = Model => catchAsync(async (req, res, next) => {

    const data = await Model.create(req.body) // safe, as properties not in schema will be ignored

    return res.status(201).json({ status: 'success', data })

})


export const getOne = Model => catchAsync(async (req, res, next) => {
    let data = await Model.findById(req.params.id)

    if (!data) throw new AppError(`No ${Model.modelName.toLowerCase()} with that id.`, 404)
    // return next(new AppError(`No ${Model.modelName} with that id.`, 404))

    res.status(200).json({
        status: 'success',
        data
    })

})

export const updateOne = (Model) => catchAsync(async (req, res, next) => {

    let data = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })

    if (!data) return next(new AppError(`No ${Model.modelName.toLowerCase()} with that id.`, 404))

    res.status(200).json({
        status: 'success',
        data
    })

})

export const deleteOne = Model => catchAsync(async (req, res, next) => {
    const data = await Model.findByIdAndDelete(req.params.id)

    if (!data) return next(new AppError(`No ${Model.modelName.toLowerCase()} with that id.`, 404))

    res.status(204).json({
        status: 'success'
    })
})

export const createMany = async (Model, objs) => {
    const docs = await Model.create([...objs])

    return docs
}