import mongoose from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required.']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is requred.']
    },
    email: {
        type: String,
        required: [true, 'User email is required.'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: {
        type: String
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Password is required.'],
        minlength: 8,
        select: false
    },
    confirmPassword: {
        type: String,
        required: [true, 'Confirm password is required.'],
        validate: {
            validator: function (val) { return val === this.password }, // This only works on save or create
            message: 'Passwords do not match.'
        }
    },
    passwordChangedAt: Date,
    passswordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

// Editable fields
// options: all, few, one, none
const EDITABLE_FIELDS = ['name', 'email', 'photo', 'role']

userSchema.pre('findOneAndUpdate', function (next) {
    // TODO: recheck this implementation
    this._update = EDITABLE_FIELDS.reduce((prev, curr) => ({ ...prev, [curr]: this._update[curr] }), {})
    console.log(this._update)
    next()
})

// Parent Referencing (parent doesnt know anything about child): Virtual populate - step one, query.populate - step two
// userSchema.virtual('reviews', {
//     ref: 'Review',
//     foreignField: 'user',
//     localField: '_id'
// })

// Encrypt password
userSchema.pre('save', async function (next) {

    // 1) only encrypt on new users
    if (!this.isModified('password')) return next()

    // 2) encrypt
    this.password = await bcrypt.hash(this.password, 12)

    // 3) delete confirmPassword
    this.confirmPassword = undefined

    next()
})

// Update changedPasswordAt
userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next()

    // hack to solve database slow operation
    this.passwordChangedAt = Date.now() - 1000

    next()

})

// Ignore deleted users
userSchema.pre(/^find/, function (next) {
    this.find({ active: true })
    next()
})


// Ignore fields on creation & save 
userSchema.post('save', function () {
    this.password = undefined
    this.active = undefined
})

// Check if password is correct (bcrypt comparison)
userSchema.methods.correctPassword = async (candidatePassword, userPassword) => {
    return await bcrypt.compare(candidatePassword, userPassword)
}

// Check if password is changed after issuing a token
userSchema.methods.changedPasswordAfterIssuedToken = function (JWTTimeStamp) {
    if (!this.passwordChangedAt) return false

    const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10)  // convert to milliseconds with base 10

    return JWTTimeStamp < changedTimeStamp
}

// Create token for password reset 
userSchema.methods.createPasswordResetToken = function () {
    // 1) generate token
    const resetToken = crypto.randomBytes(32).toString('hex')

    // 2) encrypt token and save to db
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    // 3) expires in 10 minutes
    const expiresIn = 10 * 60 * 1000
    this.passwordResetExpires = Date.now() + expiresIn

    return resetToken
}

const User = mongoose.model("User", userSchema);

export default User