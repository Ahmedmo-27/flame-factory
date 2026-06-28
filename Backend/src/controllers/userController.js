const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//Register
const registerUser = async (req, res) => {
    try {
        const {name, email, password, role} = req.body;

        const userExists = await User.findOne({email});
        if(userExists){
            return res.status(400).json({message: "User already exists"});
        }

        //hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role
        });

        res.status(201).json({
            message: "User created",
            user
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//Login
const loginUser =  async (req, res) =>{
    const{email, password} = req.body;

    const user = await User.findOne({email});
    if(!user){
        return res.status(400).json({message: "User not found"});
    }
    
    // compare password
    const isMatch = await bcrypt.compare(password,user.password);
    if(!isMatch){
        return res.status(400).json({message: "invalid password"});
    }
    // create  token 
    const token = jwt.sign(
        {
            id:user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {expiresIn:"1d"}
    );
    
    res.json({
    message:"login successful",
    token,
    user
    });
    



};
// Get all sales users (for dropdown)
const getSalesUsers = async (req, res) => {
    try {
        const salesUsers = await User.find(
            { role: { $in: ["sales", "Sales Manager"] } },
            "name role"  // only return name and role, not password
        ).sort({ name: 1 });

        res.status(200).json({ salesUsers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {registerUser, loginUser, getSalesUsers};