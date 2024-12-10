import jwt from 'jsonwebtoken';

export const generateAccessToken = (user) => {
    return jwt.sign({
        _id:user._id,
        email:user.email,
        userName:user.userName
    },
        process.env.ACCESS_TOKEN_SECRET,{
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }


    )
}