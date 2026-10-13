const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeaderAuthorization = req.headers.authorization;

  if (
    !authHeaderAuthorization ||
    authHeaderAuthorization.split(" ")[0] !== "Bearer"
  ) {
    return res.status(401).json({
      message: "No token found",
    });
  }

  const token = authHeaderAuthorization.split(" ")[1];
  try{
  const decoded =jwt.verify(token, process.env.JWT_SECRET)
   req.user = decoded
   next()
  }catch(err){
    console.error(err)
    return res.status(401).json({message: "Invalid or expired token"})
  }
 
}

module.exports = authMiddleware;