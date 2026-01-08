import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { User } from '../../../auth-service/src/entities/user.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private httpService: HttpService,
  ) {}

  async getVendor(vendorId: string) {
    const vendor = await this.userRepository.findOne({
      where: { id: vendorId, role: 'vendor' },
      select: ['id', 'email', 'first_name', 'last_name', 'phone', 'role', 'created_at'],
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async applyAsVendor(createVendorDto: CreateVendorDto) {
    const { userId, businessName, businessType, taxId } = createVendorDto;

    // Verificar que el usuario existe
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'vendor') {
      throw new BadRequestException('User is already a vendor');
    }

    // Actualizar rol a vendor
    user.role = 'vendor';
    await this.userRepository.save(user);

    // TODO: Crear tabla de vendor_profiles con business_name, tax_id, etc.
    return {
      success: true,
      message: 'Vendor application submitted successfully',
      vendorId: user.id,
      // En producción, aquí se crearía una aplicación pendiente de aprobación
    };
  }

  async getVendorProducts(vendorId: string, page: number = 1, limit: number = 20) {
    // Verificar que el vendor existe
    const vendor = await this.userRepository.findOne({
      where: { id: vendorId, role: 'vendor' },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Llamar al product-service para obtener productos
    try {
      const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3004';
      const response = await firstValueFrom(
        this.httpService.get(
          `${productServiceUrl}/products`,
          {
            params: { vendor_id: vendorId, page, limit },
            timeout: 5000, // 5 seconds timeout
          }
        )
      );

      return response.data;
    } catch (error) {
      console.error('Failed to fetch vendor products:', error.message);
      return {
        products: [],
        total: 0,
        message: 'Failed to fetch products',
      };
    }
  }

  async updateVendorProfile(vendorId: string, updateData: UpdateVendorDto) {
    const vendor = await this.userRepository.findOne({
      where: { id: vendorId, role: 'vendor' },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    Object.assign(vendor, updateData);
    await this.userRepository.save(vendor);

    const { password_hash, two_factor_secret, ...sanitized } = vendor;
    return sanitized;
  }

  async getVendorStats(vendorId: string) {
    // TODO: Implementar estadísticas reales consultando order-service
    return {
      vendorId,
      totalSales: 0,
      totalOrders: 0,
      averageRating: 0,
      totalRevenue: 0,
      message: 'Stats endpoint - implementation pending',
    };
  }
}
