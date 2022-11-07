import path from 'path'
import express from 'express'
import morgan from 'morgan'
import cors from 'cors'

// config
import config from './config'

// Error Handling
import AppError from './utils/appError'
import errorController from './utils/errorController'

// Routers
import userRouter from './models/user'


// Rate limit
import rateLimit from 'express-rate-limit'

// Http security
import helmet from 'helmet'

// Sanitization
import mongoSanitize from 'express-mongo-sanitize'
import xss from 'xss-clean'

// Parameter Pollution
import hpp from 'hpp'
import seed from '../seed'

// Init app
const app = express()

// Proxy enabline
app.enable('trust proxy')

// Cross origin resource sharing
// Allow for simple requests (get, post)
app.use(cors())

// Allow for complex requests (patch, put, delete) --- preflied face???
// for which the browser sends a verifciation request to perform our action
app.options('*', cors())

// Development request logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

// Serving static files
app.use("/public", express.static(path.join(__dirname, "public")));


// Middleware

// 0) body-parser: reading data from body to req.body
app.use(express.json({ limit: '10kb' }))

// 1) Data Sanitization aganist noSql query injection (mongo query in request params & body) & cross-site scripting attacks(js in html)
app.use(mongoSanitize())
app.use(xss())

// 2) set security http headers to response object from server
app.use(helmet())

// 3) Prevent Parameter Pollution: it clears the query string at the end
// whitelist are parameters allowed to duplicate
app.use(hpp({
    whitelist: ['duration']
}))

// 4) request time
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    next()
})

// 5) rate limiter (limits requests from same IP) & put limit in headers
// if app restarted, it resets the limit
const { request_rate_limit, request_rate_limit_reset_time } = config.rate_limit

const hours = request_rate_limit_reset_time / (60 * 60 * 1000)

const limiter = rateLimit({
    max: request_rate_limit,
    windowMs: request_rate_limit_reset_time,
    message: `Too many requests from this IP. Please try again in ${hours === 1 ? `one hour` : `${hours} hours`}.`
})

app.use('/api', limiter)


// 6) Routers

app.use('/api/v1/users', userRouter)

console.log(process.env.NODE_ENV)

// 7) Error controller
app.use(errorController)

// 8) seed
// seed()

// app.use()
export default app