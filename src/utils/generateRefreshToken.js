import jwt from 'jsonwebtoken';

export const generateRefreshToken = (user) => {
    return jwt.sign({
        _id:user._id,
        email:user.email,
        userName:user.userName
    },
        process.env.REFRESH_TOKEN_SECRET,{
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }


    )
}