import express from 'express'
import cors from 'cors'
import israelpostRouter from './routes/israelpost.js'

const app = express()
app.use(express.json())
app.use(cors({ origin: 'http://localhost:5173' }))
app.use('/api/israelpost', israelpostRouter)

app.listen(3001, () => console.log('Server running on http://localhost:3001'))
