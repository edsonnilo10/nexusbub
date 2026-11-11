# Unicred financing message from simulation screenshots

## What you will see
On each course's WhatsApp tab, a new card called **"Financiamento Unicred"**:

1. Paste (Ctrl+V), drag or attach one or more screenshots of the Unicred simulation.
2. The system reads each screenshot and pulls out only the **Valor líquido** (cash price) and the **number of installments with the installment amount**. Interest, CET, IOF and dates are ignored.
3. It shows a small table you can check and fix (cash price and each "Nx de R$"), add or remove rows, and the message updates instantly.
4. "Copiar" button, character counter (4.095 limit), same look as the other message cards.

The course title comes from the tab you are in (e.g. "GIOB + TRVG"), so you don't type it.

## Message format (follows the existing investment message)
```text
*CURSO BÁSICO DE GINECOLOGIA E OBSTETRÍCIA + TRANSVAGINAL – NEXUS 2027*
🕒 *Carga Horária:* 90h

💰 *INVESTIMENTO*

✔️ *Valor à vista:* R$ 14.338,00

🏦 Agora também contamos com o *Financiamento Estudantil Unicred*, parceira da Nexus, que facilita ainda mais o seu investimento!

📅 O primeiro pagamento pode ser feito em até *45 dias*, com as seguintes opções:

( ) 14x de R$ 1.202,40
( ) 15x de R$ ...
( ) 16x de R$ ...

Podemos prosseguir com a reserva da sua vaga? 😊
```
Installments are sorted from smallest to largest. If the screenshots show different cash values, a warning appears so you can confirm.

## Notes
- Nothing is saved automatically; screenshots are only read, not stored. The message can be edited before copying.
- Works for every course (modular and postgraduate, e.g. 40x).

## Technical details
- New edge function `read-unicred-simulation`: receives images (base64), calls Lovable AI Gateway (`openai/gpt-6-astra`, Responses API, image input, strict JSON schema `{valor_liquido, parcelas, valor_parcela}` per image), requires a signed-in approved user. Handles 402/429 with clear messages.
- `src/lib/unicredMessage.ts`: pure `unicredFinancingMessage(course, classes, cashValue, options)` reusing `formatWorkload`/`referenceYear`, dedupes by installment count, sorts, BRL formatting; tests in `unicredMessage.test.ts`.
- `src/components/course/UnicredFinancingCard.tsx` mounted in `CourseWhatsAppTab.tsx` after the investment card (both 2026 and 2027).
