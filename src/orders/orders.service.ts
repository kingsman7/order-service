import { Injectable, Inject, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import axios from 'axios';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly cartServiceUrl = process.env.CART_SERVICE_URL || 'http://localhost:3001';

  constructor(
    private readonly prisma: PrismaService,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  async createOrder(createOrderDto: CreateOrderDto) {
    const { userId } = createOrderDto;

    // 1. Obtener el carrito activo desde CartService (Redis)
    let cartResponse;
    try {
      cartResponse = await axios.get(`${this.cartServiceUrl}/cart/${userId}`);
    } catch (error) {
      throw new BadRequestException('No se pudo obtener el carrito del usuario.');
    }

    const cart = cartResponse.data;

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('El carrito está vacío. No se puede generar la orden.');
    }

    // 2. Guardar la orden e items en PostgreSQL
    const newOrder = await this.prisma.order.create({
      data: {
        userId,
        totalAmount: cart.totalPrice,
        status: 'PENDING',
        items: {
          create: cart.items.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 3. Emitir el evento 'order.created' a Kafka
    this.kafkaClient.emit('order.created', JSON.stringify({
      eventId: crypto.randomUUID(),
      eventType: 'ORDER_CREATED',
      timestamp: new Date().toISOString(),
      payload: newOrder,
    }));

    // 4. Vaciar el carrito en Redis
    try {
      await axios.delete(`${this.cartServiceUrl}/cart/${userId}`);
    } catch (error) {
      console.warn('Advertencia: No se pudo vaciar el carrito después de crear la orden.');
    }

    return newOrder;
  }

  async getOrderById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
  }
}