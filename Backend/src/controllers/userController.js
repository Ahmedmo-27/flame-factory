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
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        }
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
        message: "login successful",
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        }
    });
};

// Get monthly sales revenue for the logged-in rep
const getSalesRevenue = async (req, res) => {
    try {
        if (req.user.role !== "Sales") {
            return res.status(403).json({ message: "Only sales representatives can access this" });
        }

        const Member = require("../models/Member");
        const members = await Member.find({ salesRep: req.user.id }).populate("package");

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const lastMonthYear = lastMonthDate.getFullYear();
        const lastMonth = lastMonthDate.getMonth();

        const monthKey = (date) => {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        };

        const isInMonth = (date, year, month) => {
            const d = new Date(date);
            return d.getFullYear() === year && d.getMonth() === month;
        };

        const monthlyMap = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - i, 1);
            const key = monthKey(d);
            monthlyMap[key] = { month: key, revenue: 0, salesCount: 0 };
        }

        let currentMonthRevenue = 0;
        let lastMonthRevenue = 0;
        let totalRevenue = 0;

        members.forEach((member) => {
            const price = member.package?.price || 0;
            if (!price) return;

            totalRevenue += price;
            const key = monthKey(member.createdAt);

            if (monthlyMap[key]) {
                monthlyMap[key].revenue += price;
                monthlyMap[key].salesCount += 1;
            }

            if (isInMonth(member.createdAt, currentYear, currentMonth)) {
                currentMonthRevenue += price;
            }
            if (isInMonth(member.createdAt, lastMonthYear, lastMonth)) {
                lastMonthRevenue += price;
            }
        });

        res.json({
            currency: "EGP",
            currentMonth: monthKey(now),
            currentMonthRevenue,
            lastMonthRevenue,
            totalRevenue,
            monthlyBreakdown: Object.values(monthlyMap),
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// List sales reps (for managers to assign members)
const getSalesReps = async (req, res) => {
    try {
        if (!["Sales Manager", "Owner"].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const reps = await User.find({ role: "Sales" }).select("name email _id");
        res.json(reps);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { registerUser, loginUser, getSalesRevenue, getSalesReps };