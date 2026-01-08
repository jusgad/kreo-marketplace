import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../auth-service/src/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getUserProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'first_name', 'last_name', 'phone', 'avatar_url', 'role', 'email_verified'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateData);
    await this.userRepository.save(user);

    // Return user without sensitive data
    const { password_hash, two_factor_secret, ...sanitized } = user;
    return sanitized;
  }

  async getUserAddresses(userId: string) {
    // TODO: Implement addresses table and relationship
    // For now, return empty array
    return {
      userId,
      addresses: [],
      message: 'Address management not yet implemented',
    };
  }
}
