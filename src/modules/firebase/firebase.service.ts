import { Injectable, UnauthorizedException } from '@nestjs/common';
import admin, { messaging } from 'firebase-admin';
import Message = messaging.Message;
import { Request } from 'express';

@Injectable()
export class FirebaseService {
  async sayMyName() {
    const message: Message = {
      topic: 'test',
      android: {
        priority: 'high',
      },
      data: {
        test: 'Hello, World!',
      },
    };
    return await admin
      .messaging()
      .send(message)
      .then((response) => {
        return { message: 'Successfully sent message:', response: response };
      });
  }

  async validateToken(token: string) {
    return await admin
      .auth()
      .verifyIdToken(token)
      .then((decodedToken) => {
        console.log(decodedToken);
        return true;
      })
      .catch((error) => {
        throw new UnauthorizedException({
          message: 'Unauthorized',
          error: error,
        });
      });
  }

  async getCustomerIdFromToken(request: Request) {
    const token = request.headers['authorization'].split(' ')[1];
    return await admin
      .auth()
      .verifyIdToken(token)
      .then((decodedToken) => {
        return decodedToken.uid;
      })
      .catch((error) => {
        throw new UnauthorizedException({
          message: 'Unauthorized',
          error: error,
        });
      });
  }

  async sendNotificationToTopic(
    topic: string,
    data: any,
    notification?: { title: string; body: string; imageUrl?: string },
  ) {
    const message: Message = {
      topic: topic,
      android: {
        priority: 'high',
      },
      data: data,
      notification: notification,
    };
    return await admin
      .messaging()
      .send(message)
      .then((response) => {
        return { message: 'Successfully sent message:', response: response };
      });
  }
  async sendTestNotification() {
    const message: Message = {
      topic: 'test',
      android: {
        priority: 'high',
      },
      notification: {
        title: 'Hello, World!',
        body: 'This is a test notification!',
      },
    };
    return await admin
      .messaging()
      .send(message)
      .then((response) => {
        return { message: 'Successfully sent message:', response: response };
      });
  }
  async sendNotificationToToken(
    token: string,
    data: any,
    notification?: { title: string; body: string; imageUrl?: string },
  ) {
    const message: Message = {
      token: token,
      android: {
        priority: 'high',
      },
      data: data,
      notification: notification,
    };
    return await admin
      .messaging()
      .send(message)
      .then((response) => {
        return { message: 'Successfully sent message:', response: response };
      });
  }
}
