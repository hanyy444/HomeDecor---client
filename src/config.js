import dotenv from "dotenv";

dotenv.config()

const config = {
    port: process.env.PORT,
    database: process.env.DATABASE_URI,
    jwt: {
        jwt_secret: process.env.JWT_SECRET,
        jwt_expires_in: process.env.JWT_EXPIRES_IN,
        jwt_cookie_expires_in: process.env.JWT_COOKIE_EXPIRES_IN
    },
    rate_limit: {
        request_rate_limit: process.env.REQUEST_RATE_LIMIT,
        request_rate_limit_reset_time: process.env.REQUEST_RATE_LIMIT_RESET_TIME
    },
}

export default config