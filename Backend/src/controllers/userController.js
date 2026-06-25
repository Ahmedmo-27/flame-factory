const User = require("..//models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//Register
const registerUser = async (req, res) => {
    const {name, email, password, role} = req.body;

    const userExists = await User.findOne({email});
    if(userExists){
        return res.status(400).json({message: "User already exists"});
    }

    //hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt)

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
module.exports = {registerUser, loginUser};