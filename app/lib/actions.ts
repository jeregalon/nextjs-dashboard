'use server'
import z from "zod"
import postgres from 'postgres';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/* use server es para marcar que todas las funciones que se exportan en este archivo
son de servidor, y por lo tanto no se ejecutan ni se envían al cliente */

const CreateInvoiceFormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string()
})

const CreateInvoiceSchema = CreateInvoiceFormSchema.omit({
  id: true,
  date: true
})

const UpdateInvoice = CreateInvoiceFormSchema.omit({ 
  id: true, 
  date: true 
});

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoiceSchema.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })

  const amountInCents = amount * 100
  const [date] = new Date().toISOString().split('T')

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `
  } catch(e) {
    console.error(e)
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  /*Para que no cachee*/
  revalidatePath('/dashboard/invoices')
  
  /*Redireccionar al usuario a la página anterior*/
  redirect('/dashboard/invoices')
}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `
  } catch (e) {
    console.error(e)
    return {
      message: 'Database Error: Failed to Update Invoice.'
    }
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`
  } catch (e) {
    console.error(e)
    return {
      message: 'Database Error: Failed to Delete Invoice.'
    }
  }
  revalidatePath('/dashboard/invoices');
}