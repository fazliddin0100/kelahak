// lib/jwt.ts
import {jwtDecode} from "jwt-decode";

export interface CustomJwtPayload {
    userId: string;
    department?: string;
}

export function decodeToken(token: string): CustomJwtPayload {
    return jwtDecode<CustomJwtPayload>(token);
}


