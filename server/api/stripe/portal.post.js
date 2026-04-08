// server/api/stripe/portal.post.js
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const cookieHeader = getHeader(event, 'cookie') ?? ''
  const token = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/)?.[1]

  let userId
  if (token) {
    const decoded = JSON.parse(decodeURIComponent(token))
    const { data: { user } } = await supabase.auth.getUser(decoded?.access_token)
    userId = user?.id
  }

  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (!profile?.stripe_customer_id) {
    throw createError({ statusCode: 400, statusMessage: 'No billing account found' })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer:   profile.stripe_customer_id,
    return_url: `${process.env.APP_URL}/account`,
  })

  return { data: { url: session.url } }
})