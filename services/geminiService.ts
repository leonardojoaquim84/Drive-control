
import { GoogleGenAI, Type } from "@google/genai";
import { Vehicle, FuelEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getFuelInsights = async (vehicle: Vehicle) => {
  if (vehicle.entries.length === 0) return "Adicione alguns abastecimentos para receber insights da IA.";

  const dataSummary = vehicle.entries.map(e => ({
    date: e.date,
    fuel: e.fuelType,
    efficiency: e.efficiency.toFixed(2),
    pricePerLiter: e.pricePerLiter.toFixed(2),
    costPerKm: (e.value / e.kmPartial).toFixed(2)
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise o histórico de abastecimento deste veículo (${vehicle.name}): ${JSON.stringify(dataSummary)}. 
      Forneça 3 dicas curtas e práticas sobre eficiência de combustível ou qual combustível está compensando mais (Álcool vs Gasolina) baseado nos dados. Responda em Português do Brasil.`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 300,
      }
    });

    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao carregar insights inteligentes.";
  }
};
