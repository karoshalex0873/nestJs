import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import * as argon from 'argon2';
import { UserDto } from './dto';
import { MailsService } from 'src/mails/mails.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private emailService: MailsService
  ) { }

  // get me service
  async getMe(userId: string) {
    // 1. get user from the db of logged in user
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. return the user
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // update profile service 
  async updateProfile(userId: string, dto: UserDto) {
    // pass the body of the request from dto for the logged in user to update the profile
    const { email, firstName, lastName } = dto;
    // 1. update the user in the db
    const updateUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        email,
        firstName,
        lastName,
      }
    })

    // send the email to the user for profile update
    await this.emailService.sendMail({
      to: updateUser.email,
      subject: 'Profile Updated',
      text: 'Your profile has been updated successfully',
    })


    // 2. return the updated user
    const { password, ...userWithoutPassword } = updateUser;
    return userWithoutPassword;
  }

  // update password service of the logged in user
  async updatePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
    // 1.  get the pwd from the body request and logged in user id from the request
    const { currentPassword, newPassword } = dto;

    // 2. Send the code to the email for password reset and also update the password in the db after verifying the code and also hash the new password before saving it to the db
    // 1. get the user from the db
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    })

    if (!user) {
      throw new NotFoundException('User not found');
    }
    // 2. compare the current password with the hashed password in the database
    const isPasswordMatch = await argon.verify(user.password, currentPassword);
    if (!isPasswordMatch) {
      throw new NotFoundException('Current password is incorrect');
    }
    // 3. hash the new password
    const hashedNewPassword = await argon.hash(newPassword);
    // 4. update the password in the db
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedNewPassword,
      }
    })

    await this.emailService.sendMail({
      to: user.email,
      subject: 'Password Updated',
      text: 'Your password has been changed successfully.',
    });

    // 3. return the updated user
    return this.getMe(userId);
  }

}

