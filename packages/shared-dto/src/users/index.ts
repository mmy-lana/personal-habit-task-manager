import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
}

export interface AuthTokenResponseDto {
  accessToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequestDto {
  refreshToken?: string;
}

export class RegisterUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class LoginUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
