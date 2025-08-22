import {
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { hash, verify } from "argon2";
import { JwtService } from "@nestjs/jwt";
import { Staff, StaffStatus } from "@prisma/client";
import { DatabaseService } from "../database/database.service";
import { ConfigService } from "@nestjs/config";
import { AccessToken } from "./auth.strategy";

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
    private jwtService: JwtService
  ) {}

  async logInLocal(credentials: { username: string; password: string }) {
    const foundStaff = await this.databaseService.staff.findUnique({
      where: {
        username: credentials.username
      }
    });

    if (!foundStaff) {
      throw new ForbiddenException("Staff account not found");
    }

    if (foundStaff.status === StaffStatus.INACTIVE) {
      throw new ForbiddenException("Account is inactive");
    }

    const isPasswordCorrect = await this.verifyHash(
      foundStaff.password,
      credentials.password
    );

    if (!isPasswordCorrect) {
      throw new ForbiddenException("Incorrect password");
    }

    const { accessToken, refreshToken } = await this.generateTokens({
      id: foundStaff.id,
      staffId: foundStaff.staffId,
      role: foundStaff.role
    });

    await this.storeRefreshToken({
      id: foundStaff.id,
      refreshToken
    });

    // Update last login timestamp
    await this.databaseService.staff.update({
      where: { id: foundStaff.id },
      data: { lastLogin: new Date() }
    });

    return { 
      id: foundStaff.id, 
      staffId: foundStaff.staffId,
      fullName: foundStaff.fullName,
      role: foundStaff.role,
      accessToken, 
      refreshToken 
    };
  }

  async logOut(staff: Pick<Staff, "id">) {
    const foundStaff = await this.databaseService.staff.findUnique({
      where: {
        id: staff.id
      }
    });

    if (!foundStaff) {
      throw new ForbiddenException("Staff account not found");
    }

    if (!foundStaff.refreshToken) {
      throw new ForbiddenException("Already logged out");
    }

    await this.databaseService.staff.update({
      where: {
        id: staff.id
      },
      data: {
        refreshToken: null
      }
    });
  }

  async refreshToken(staff: Pick<Staff, "id" | "refreshToken">) {
    const foundStaff = await this.databaseService.staff.findUnique({
      where: {
        id: staff.id
      }
    });

    if (!foundStaff) {
      throw new ForbiddenException("Staff account not found");
    }

    if (!foundStaff.refreshToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const isRefreshTokenValid = await this.verifyHash(
      foundStaff.refreshToken,
      staff.refreshToken
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const { accessToken, refreshToken } = await this.generateTokens({
      id: foundStaff.id,
      staffId: foundStaff.staffId,
      role: foundStaff.role
    });

    await this.storeRefreshToken({
      id: foundStaff.id,
      refreshToken
    });

    return { accessToken, refreshToken };
  }

  async storeRefreshToken(staff: Pick<Staff, "id" | "refreshToken">) {
    staff.refreshToken = await this.createHash(staff.refreshToken);

    await this.databaseService.staff.update({
      where: {
        id: staff.id
      },
      data: {
        refreshToken: staff.refreshToken
      }
    });
  }

  async generateTokens(payload: AccessToken) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("ACCESS_KEY"),
      expiresIn: "1d"
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("REFRESH_KEY"),
      expiresIn: "7d"
    });

    return { accessToken, refreshToken };
  }

  async createHash(inputString: string) {
    return await hash(inputString);
  }

  async verifyHash(referenceHash: string, inputString: string) {
    return await verify(referenceHash, inputString);
  }
}