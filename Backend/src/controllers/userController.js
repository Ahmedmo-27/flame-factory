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

// Get sales target
const getSalesTarget = async (req, res) => {
    try {
        if (req.user.role !== "Sales") {
            return res.status(403).json({ message: "Only sales representatives can access this" });
        }

        const Member = require("../models/Member");
        
        // Find all members assigned to this sales rep
        // We calculate revenue based on the package price of these members
        const members = await Member.find({ salesRep: req.user.id }).populate("package");
        
        // Calculate achieved revenue
        let achievedTarget = 0;
        members.forEach(member => {
            if (member.package && member.package.price) {
                achievedTarget += member.package.price;
            }
        });

        const user = await User.findById(req.user.id);

        res.json({
            monthlyTarget: user.monthlyTarget,
            achievedTarget: achievedTarget,
            currency: "EGP" // Or whatever the default currency is
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {registerUser, loginUser, getSalesTarget};