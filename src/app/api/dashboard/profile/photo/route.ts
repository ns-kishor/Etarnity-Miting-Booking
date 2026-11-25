import { db } from '@/lib/db'
import { ok, fail, unauthorized } from '@/lib/api'
import { requireBoardMember } from '@/lib/auth'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dashboard/profile/photo
 * Accepts any image file uploaded from device (JPEG, PNG, WebP, GIF, SVG, AVIF, TIFF, HEIC/HEIF).
 * Automatically auto-orients, resizes to portrait avatar dimensions, converts to optimized WebP,
 * and saves to the database as a data URL.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireBoardMember()
    if (!auth) return unauthorized()

    const formData = await req.formData()
    const file = formData.get('photo') as File | null
    if (!file) {
      return fail('No image file was provided.', 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    if (buffer.length === 0) {
      return fail('The uploaded file is empty.', 400)
    }

    // Limit maximum upload size to 25MB to prevent abuse
    if (buffer.length > 25 * 1024 * 1024) {
      return fail('Image size exceeds maximum limit of 25MB.', 400)
    }

    let processedBuffer: Buffer
    let mimeType = 'image/webp'

    try {
      // Sharp supports JPEG, PNG, WebP, GIF, SVG, TIFF, AVIF, HEIC/HEIF
      processedBuffer = await sharp(buffer)
        .rotate() // auto-orient based on EXIF tags (iPhone camera angle, etc.)
        .resize(800, 800, {
          fit: 'cover',
          position: 'top',
          withoutEnlargement: true,
        })
        .webp({ quality: 85, effort: 4 })
        .toBuffer()
    } catch (sharpError: any) {
      console.warn('[photo-upload] Sharp webp failed, attempting jpeg fallback:', sharpError?.message)
      try {
        processedBuffer = await sharp(buffer)
          .rotate()
          .resize(800, 800, {
            fit: 'cover',
            position: 'top',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toBuffer()
        mimeType = 'image/jpeg'
      } catch (fallbackError: any) {
        console.warn('[photo-upload] Fallback failed:', fallbackError?.message)
        // If file is SVG or raw image under 2MB, fallback to raw buffer
        if (buffer.length < 2 * 1024 * 1024 && (file.type?.startsWith('image/') || file.name.endsWith('.svg'))) {
          processedBuffer = buffer
          mimeType = file.type || 'image/png'
        } else {
          return fail('Could not process this image format. Please ensure it is a valid image file.', 400)
        }
      }
    }

    const base64Data = processedBuffer.toString('base64')
    const photoUrl = `data:${mimeType};base64,${base64Data}`

    // Update board member record directly
    await db.boardMember.update({
      where: { id: auth.member.id },
      data: { photoUrl },
    })

    return ok({
      photoUrl,
      message: 'Profile photograph uploaded and updated successfully.',
    })
  } catch (error: any) {
    console.error('[photo-upload error]:', error)
    return fail(error?.message || 'Failed to upload photo.', 500)
  }
}

/**
 * DELETE /api/dashboard/profile/photo
 * Clears the member's profile photograph.
 */
export async function DELETE() {
  try {
    const auth = await requireBoardMember()
    if (!auth) return unauthorized()

    await db.boardMember.update({
      where: { id: auth.member.id },
      data: { photoUrl: '' },
    })

    return ok({ message: 'Profile photograph removed.' })
  } catch (error: any) {
    return fail(error?.message || 'Failed to remove photo.', 500)
  }
}
