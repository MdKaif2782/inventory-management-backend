import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { StaffRole } from "@prisma/client";

export interface AccessToken {
  id: string;
  staffId: string;
  role: StaffRole;
}

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("ACCESS_KEY")
    });
  }

  async validate(payload: AccessToken) {
    return payload;
  }
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh"
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("REFRESH_KEY"),
      passReqToCallback: true
    });
  }

  async validate(req: Request, payload: AccessToken) {
    const refreshToken = req.get("Authorization").replace("Bearer ", "").trim();

    return {
      ...payload,
      refreshToken
    };
  }
}
