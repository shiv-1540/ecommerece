const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require('multer');
const YieldSell = require("./models/yieldsell.js")
const User = require("./models/users.js")
const RentProduct=require("./models/rent.js")
const db = require("./db.js")

require('dotenv').config({ path: './config/.env' });
require("dotenv").config();



const app = express();
const PORT = 5000;

app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve static files
// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage: storage });

app.use(cors());

db.on('connected', () => {
    console.log('successfully connected to mongodb server');
});

// Farmer Signup (No Authentication)
app.post('/api/farmer/signup', async (req, res) => {
    console.log("Farmer signup route hit with data:", req.body);

    const {
        first_name,
        last_name,
        contact_no,
        email,
        password,
        confirmPassword,
        street,
        state,
        city
    } = req.body;

    // 🔥 Field Validation
    if (
        !first_name || !last_name || !contact_no ||
        !email || !password || !confirmPassword
        || !state || !city || !street
    ) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // 🔥 Password Match Check
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        // 🔥 Check if the email is already registered
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({ message: 'Email is already registered' });
        }

        // 🔥 Create a new Farmer
        const newFarmer = new User({
            user_id: "user102",
            first_name,
            last_name,
            contact_no,
            email,
            password,           // Storing plain text password (No hashing)
            role: 'Farmer',     // Set the role explicitly
            location: {
                street,
                state,
                city
            }
        });

        // 🔥 Save to DB
        const savedFarmer = await newFarmer.save();

        res.status(201).json({
            message: 'Farmer registered successfully',
            farmer: {
                user_id: savedFarmer._id,
                first_name: savedFarmer.first_name,
                last_name: savedFarmer.last_name,
                email: savedFarmer.email,
                role: savedFarmer.role,
                location: savedFarmer.location
            }
        });

    } catch (error) {
        console.error('Error during farmer registration:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

app.post('/api/farmer/login', async (req, res) => {
    console.log("Farmer login route hit with data:", req.body);

    const { email, password } = req.body;

    // 🔥 Field Validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        // 🔥 Check if the farmer exists
        const farmer = await User.findOne({ email, role: 'Farmer' });

        if (!farmer) {
            return res.status(404).json({ message: 'Farmer not found' });
        }

        // 🔥 Verify Password (Plain text comparison)
        if (farmer.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 🔥 Successful Login
        res.status(200).json({
            message: 'Login successful',
            farmer: {
                user_id: farmer._id,
                first_name: farmer.first_name,
                last_name: farmer.last_name,
                email: farmer.email,
                role: farmer.role,
                location: farmer.location
            }
        });

    } catch (error) {
        console.error('Error during farmer login:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Function to load JSON data safely
const loadJSONData = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        console.error(Error reading JSON file: ${filePath}, error);
        return [];
    }
};

app.post('/api/rentproducts/add', async (req, res) => {
    console.log("Add Rent Product route hit with data:", req.body);

    // Destructure request body
    const { 
        farmer_id, 
        equipment_name, 
        description, 
        rent_price_per_day, 
        start_date, 
        end_date, 
        street, 
        city, 
        state, 
        images 
    } = req.body;

    // ✅ Validation for required fields
    if (!farmer_id) return res.status(400).json({ message: 'Farmer ID is required' });
    if (!equipment_name) return res.status(400).json({ message: 'Equipment name is required' });
    if (!description) return res.status(400).json({ message: 'Description is required' });
    if (!rent_price_per_day) return res.status(400).json({ message: 'Rent price per day is required' });
    if (!start_date) return res.status(400).json({ message: 'Start date is required' });
    if (!end_date) return res.status(400).json({ message: 'End date is required' });
    if (!street) return res.status(400).json({ message: 'Street is required' });
    if (!city) return res.status(400).json({ message: 'City is required' });
    if (!state) return res.status(400).json({ message: 'State is required' });

    try {
        // Create new product
        const newProduct = new RentProduct({
            farmer_id,
            equipment_name,
            description,
            rent_price_per_day,
            start_date,
            end_date,
            street,
            city,
            state,
            images: images || []  // Add images if available, default to an empty array
        });

        // Save to DB
        const savedProduct = await newProduct.save();
        res.status(201).json({ message: 'Rent product added successfully', product: savedProduct });

    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});
// Get all Rent Products (with location filter)
app.get('/api/farmer/SerachEqp', async (req, res) => {
    const { state, city } = req.query;   // Filtering based on location

    try {
        let query = {};

        if (state) query['location.state'] = state;
        if (city) query['location.city'] = city;

        const products = await RentProduct.find(query);
        
        if (products.length === 0) {
            return res.status(404).json({ message: "No rent products found for the specified location" });
        }

        res.status(200).json({ products });

    } catch (error) {
        console.error('Error fetching rent products:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Update Rent Product
app.put('/api/farmer/updateEqp/:id', async (req, res) => {
    try {
        const updatedProduct = await RentProduct.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Rent product not found' });
        }

        res.status(200).json({ message: 'Rent product updated successfully', product: updatedProduct });

    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Delete Rent Product
app.delete('/api/farmer/deleteEqp/:id', async (req, res) => {
    try {
        const deletedProduct = await RentProduct.findByIdAndDelete(req.params.id);

        if (!deletedProduct) {
            return res.status(404).json({ message: 'Rent product not found' });
        }

        res.status(200).json({ message: 'Rent product deleted successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

//================================================================================

// Add Yield Sell
app.post('/api/farmer/yieldadd', async (req, res) => {
    const { farmer_id, crop_name, description, price_per_kg, quantity, location, images } = req.body;

    if (!farmer_id || !crop_name || !price_per_kg || !quantity || !location) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const newYieldSell = new YieldSell({
            farmer_id,
            crop_name,
            description,
            price_per_kg,
            quantity,
            location,
            images
        });

        const savedYield = await newYieldSell.save();
        res.status(201).json({ message: 'Yield added successfully', yield: savedYield });

    } catch (error) {
        console.error('Error adding yield:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Get all Yield Sell Products (with location filter)
app.get('/api/farmer/getallyield', async (req, res) => {
    const { state, city } = req.query;

    try {
        let query = {};

        if (state) query['location.state'] = state;
        if (city) query['location.city'] = city;

        const yields = await YieldSell.find(query);

        if (yields.length === 0) {
            return res.status(404).json({ message: "No yield products found for the specified location" });
        }

        res.status(200).json({ yields });

    } catch (error) {
        console.error('Error fetching yields:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});




// Start server
app.listen(PORT, () => {
    console.log(✅ Server running on http://localhost:${PORT});
});
