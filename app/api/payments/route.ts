import { NextRequest, NextResponse } from 'next/server';
import db from '@/app/lib/db';
import { sendMail } from '@/app/lib/mailer';
import {logError, logInfo, NextErrorResponse} from "@/app/lib/logger";
import {ErrorType} from "@/app/types/ErrorType";

function pluralizeMonths(n: number): string {
    if (n === 1) return 'месяц';
    if (n >= 2 && n <= 4) return 'месяца';
    return 'месяцев';
}

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (body.event !== 'payment.succeeded') {
        return await NextErrorResponse(ErrorType.PaymentNotSucceed, 'Payment not succeed', 200, null);
    }

    const payment = body.object;
    const userId = payment.metadata?.user_id;
    const tariffId = payment.metadata?.tariff_id;

    if (!userId || !tariffId) {
        return await NextErrorResponse(ErrorType.PaymentMissingMetadata, 'Missing metadata', 400, userId);
    }

    const database = new db();

    const durationInMonths = await database.getTariffDuration(tariffId);
    if (!durationInMonths) {
        return await NextErrorResponse(ErrorType.PaymentTariffNotFound, 'Tariff not found', 400, userId);
    }

    const tariffName = await database.getTariffName(tariffId);
    if (!tariffName) {
        return await NextErrorResponse(ErrorType.PaymentTariffNotFound, 'Tariff not found', 400, userId);
    }

    const user = await database.getCurrentUser(userId);
    if (!user) {
        return await NextErrorResponse(ErrorType.PaymentUserNotFound, 'User not found', 400, userId);
    }

    const currentSubscription = await database.getSubscription(userId);
    const currentDate = new Date();

    if (currentSubscription) {
        const currentExpirationDate = new Date(currentSubscription.expiration_date);
        const expirationDate = new Date(currentExpirationDate);
        expirationDate.setMonth(expirationDate.getMonth() + durationInMonths);

        await database.updateSubscription(currentSubscription.id, expirationDate);
    } else {
        const expirationDate = new Date(currentDate);
        expirationDate.setMonth(expirationDate.getMonth() + durationInMonths);

        await database.addSubscription(userId, tariffId, currentDate, expirationDate);
    }

    const profileUrl = 'https://klinicheskie-rekomendatsii.ru/profile';
    const demoUrl = 'https://easymed.pro/kr/';
    const wordMonths = pluralizeMonths(durationInMonths);

    const html = `
    <h2>Здравствуйте, ${user.name}!</h2>
    <p>Вы приобрели подписку <b>${tariffName}</b> на <b>${durationInMonths}</b> ${wordMonths}.</p>
    <p>
      <a href="${profileUrl}">Перейти в личный кабинет</a><br>
      <a href="${demoUrl}">Перейти в справочник</a>
    </p>
  `;

    await sendMail(user.login, 'Подписка оформлена', html);

    return NextResponse.json({ message: 'Subscription saved' }, { status: 200 });
}
