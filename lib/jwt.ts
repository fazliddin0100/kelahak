// lib/jwt.ts
import {jwtDecode} from "jwt-decode";


// const JWT_SECRET = process.env.JWT_SECRET!;
// const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "12h");

export interface CustomJwtPayload {
    userId: string;
    department?: string;
}

// export function signRefreshToken(payload: object) {
//     return jwt.sign(payload, JWT_SECRET, {expiresIn: JWT_EXPIRES_IN});
// }

export function decodeToken(token: string): CustomJwtPayload {
    return jwtDecode<CustomJwtPayload>(token);
}


