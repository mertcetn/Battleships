import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Length,
  Matches,
} from 'class-validator';

export class UpdateNicknameDto {
  @IsString()
  @Length(3, 14)
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message:
      'Nickname can only contain letters, numbers, and underscores, and no spaces',
  })
  nickname!: string;
}

export class UpdateEmailDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Current password is required to change email' })
  password!: string;
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    },
    {
      message:
        'New password must be at least 8 characters and include uppercase, lowercase, and a number',
    },
  )
  newPassword!: string;
}
