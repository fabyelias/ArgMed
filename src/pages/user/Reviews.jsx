import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

const Reviews = () => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: "Por favor seleccioná una calificación",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Reseña enviada",
      description: "¡Gracias por tu opinión!",
    });

    setRating(0);
    setReview('');
  };

  const mockReviews = [
    {
      id: 1,
      doctor: 'Dr. Maria Rodriguez',
      rating: 5,
      comment: 'Excelente consulta. Muy profesional y atenta.',
      date: '2025-11-20'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-6">
          Reseñas y Comentarios
        </h1>

        {/* Write Review */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Escribir Reseña</h2>
          
          <div className="mb-4">
            <p className="text-gray-300 mb-2">Calificá tu experiencia</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            className="bg-slate-800 border-gray-700 text-white mb-4"
            placeholder="Compartí tu experiencia..."
            rows={4}
          />

          <Button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar Reseña
          </Button>
        </div>

        {/* Past Reviews */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Tus Reseñas</h2>
          <div className="space-y-4">
            {mockReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{rev.doctor}</h3>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= rev.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-300 mb-2">{rev.comment}</p>
                <p className="text-sm text-gray-500">{rev.date}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Reviews;