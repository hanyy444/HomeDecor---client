import mongoose from 'mongoose'

// Handle uncaught exceptions: errors in sync code
process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! Shutting down...')
    console.log(err.name, err.message)
    process.exit(1);
})

import config from './config.js'
import app from "./app.js"

mongoose
    .connect(config.database, {
        useNewUrlParser: true,
    })
    .then(() => console.log('DB connection successful!'))
    .catch(error => console.log(error));

const port = config.port || 3000

const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);



    app.all('*', (req, res, next) => {
        next(`Can not find ${req.originalUrl} on this server.`)
    })
})

// Handle unhandled rejections: errors in promises or databases
process.on('unhandledRejection', err => {
    console.log(err.name, err.message)
    console.log('UNHANDLED REJECTION! Shutting down...')

    // Exit application gracefully
    // 1) close server
    server.close(() => {
        // 2) exit running process (application)
        process.exit(1);
    })
})

// Handle sigterm
process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED, Shutting down gracefully..')
    server.close(() => {
        console.log('Process terminated!');
    })
})