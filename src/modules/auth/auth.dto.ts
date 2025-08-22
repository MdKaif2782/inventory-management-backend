import { StaffRole } from "@prisma/client"
import { IsEmail, IsEnum, IsString } from "class-validator"

export class RegisterLocalBody {
  @IsString({})
  username: string

  @IsString({})
  password: string

  @IsString({})
  fullName: string

  @IsEmail()
  email: string

  @IsString({})
  phone: string

  @IsEnum(StaffRole)
  role?: StaffRole
}

export class LoginLocalBody {
  @IsString({})
  password: string

  @IsString({})
  username: string
}
