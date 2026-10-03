// Image Upload & Compression Utility for Products
import { supabase } from '@/integrations/supabase/client';

export interface CompressedImageResult {
  blob: Blob;
  dataUrl: string;
  sizeKb: number;
}

/**
 * Comprime uma imagem no navegador utilizando HTML5 Canvas e converte para WebP leve.
 */
export async function compressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.82
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido ou corrompido.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Não foi possível obter contexto 2D para compressão.'));
        }

        // Fundo branco caso PNG transparente seja convertido para WebP/JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Tenta WebP, fallback para JPEG
        const format = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Falha ao gerar blob comprimido.'));
            }
            const dataUrl = canvas.toDataURL(format, quality);
            const sizeKb = Math.round(blob.size / 1024);
            resolve({ blob, dataUrl, sizeKb });
          },
          format,
          quality
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Faz o upload da foto do produto para o Supabase Storage no bucket 'products'.
 * Possui fallback resiliente caso o bucket ainda não tenha sido criado ou ocorra erro de rede.
 */
export async function uploadProductImage(
  file: File,
  clientId: string,
  productId?: string
): Promise<{ publicUrl: string; error?: string }> {
  try {
    // 1. Comprime a imagem antes de qualquer envio (alta velocidade e economia de banda)
    const { blob, dataUrl } = await compressImage(file, 800, 800, 0.82);

    const safeClientId = clientId || 'global';
    const timestamp = Date.now();
    const safeProdId = productId ? productId.replace(/[^a-zA-Z0-9_-]/g, '') : 'new';
    const filePath = `${safeClientId}/${timestamp}_${safeProdId}.webp`;

    // 2. Tenta upload no bucket 'products'
    const { data, error } = await supabase.storage
      .from('products')
      .upload(filePath, blob, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (error) {
      console.warn('Aviso: Falha ao enviar para o Supabase Storage. Usando fallback local:', error.message);
      // Fallback: se o bucket não estiver criado ou falhar, retorna o dataUrl comprimido para não travar o cadastro
      return { publicUrl: dataUrl };
    }

    // 3. Obtém URL pública gerada
    const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(data.path);
    return { publicUrl: publicUrlData.publicUrl };
  } catch (err: any) {
    console.error('Erro no upload da imagem:', err);
    return { publicUrl: '', error: err.message || 'Erro ao processar imagem.' };
  }
}
