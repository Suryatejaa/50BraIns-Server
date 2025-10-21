console.log('Health check route added')
const express = require('express')

const app = express()

app.use(express.json())

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' })
})
const PORT = process.env.PORT || 4002

// Add error handling
app.listen(PORT, (err) => {
    if (err) {
        console.error('Failed to start server:', err)
        process.exit(1)
    }
    console.log(`Server is running on port ${PORT}`)
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
    process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    process.exit(1)
})