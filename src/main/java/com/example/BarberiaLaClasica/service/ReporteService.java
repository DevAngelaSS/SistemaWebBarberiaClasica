package com.example.BarberiaLaClasica.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class ReporteService {

    // Estados de Cita: 1 pendiente, 2 en silla/confirmada, 3 completada, 0 cancelada
    private static final int ESTADO_COMPLETADA = 3;

    @PersistenceContext
    private EntityManager em;

    private double num(Object o) {
        return o == null ? 0.0 : ((Number) o).doubleValue();
    }

    /** Totales: [ingresos, cantidad de citas] */
    public Map<String, Object> resumen(LocalDate desde, LocalDate hasta) {
        Object[] fila = (Object[]) em.createQuery("""
                SELECT COALESCE(SUM(c.totalPrecio), 0), COUNT(c)
                FROM Cita c
                WHERE c.estado = :est AND c.fecha BETWEEN :d AND :h
                """)
                .setParameter("est", ESTADO_COMPLETADA)
                .setParameter("d", desde)
                .setParameter("h", hasta)
                .getSingleResult();

        double ingresos = num(fila[0]);
        long cantidad = ((Number) fila[1]).longValue();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ingresos", ingresos);
        m.put("cantidad", cantidad);
        m.put("ticketPromedio", cantidad == 0 ? 0.0 : ingresos / cantidad);
        return m;
    }

    public List<Map<String, Object>> porDia(LocalDate desde, LocalDate hasta) {
        List<Object[]> filas = em.createQuery("""
                SELECT c.fecha, COUNT(c), COALESCE(SUM(c.totalPrecio), 0)
                FROM Cita c
                WHERE c.estado = :est AND c.fecha BETWEEN :d AND :h
                GROUP BY c.fecha ORDER BY c.fecha ASC
                """, Object[].class)
                .setParameter("est", ESTADO_COMPLETADA)
                .setParameter("d", desde)
                .setParameter("h", hasta)
                .getResultList();
        return mapear(filas);
    }

    public List<Map<String, Object>> porBarbero(LocalDate desde, LocalDate hasta) {
        List<Object[]> filas = em.createQuery("""
                SELECT c.barbero.nombre, COUNT(c), COALESCE(SUM(c.totalPrecio), 0)
                FROM Cita c
                WHERE c.estado = :est AND c.fecha BETWEEN :d AND :h
                GROUP BY c.barbero.nombre ORDER BY SUM(c.totalPrecio) DESC
                """, Object[].class)
                .setParameter("est", ESTADO_COMPLETADA)
                .setParameter("d", desde)
                .setParameter("h", hasta)
                .getResultList();
        return mapear(filas);
    }

    public List<Map<String, Object>> porServicio(LocalDate desde, LocalDate hasta) {
        List<Object[]> filas = em.createQuery("""
                SELECT c.servicio.nombre, COUNT(c), COALESCE(SUM(c.totalPrecio), 0)
                FROM Cita c
                WHERE c.estado = :est AND c.fecha BETWEEN :d AND :h
                GROUP BY c.servicio.nombre ORDER BY SUM(c.totalPrecio) DESC
                """, Object[].class)
                .setParameter("est", ESTADO_COMPLETADA)
                .setParameter("d", desde)
                .setParameter("h", hasta)
                .getResultList();
        return mapear(filas);
    }

    /** Cantidad de citas por estado en el rango (para ver cancelaciones, etc.) */
    public Map<String, Long> citasPorEstado(LocalDate desde, LocalDate hasta) {
        List<Object[]> filas = em.createQuery("""
                SELECT c.estado, COUNT(c) FROM Cita c
                WHERE c.fecha BETWEEN :d AND :h
                GROUP BY c.estado
                """, Object[].class)
                .setParameter("d", desde)
                .setParameter("h", hasta)
                .getResultList();

        Map<String, Long> r = new LinkedHashMap<>();
        r.put("Pendientes", 0L);
        r.put("Confirmadas", 0L);
        r.put("Completadas", 0L);
        r.put("Canceladas", 0L);
        for (Object[] f : filas) {
            int est = ((Number) f[0]).intValue();
            long cant = ((Number) f[1]).longValue();
            switch (est) {
                case 1 -> r.put("Pendientes", cant);
                case 2 -> r.put("Confirmadas", cant);
                case 3 -> r.put("Completadas", cant);
                case 0 -> r.put("Canceladas", cant);
                default -> { }
            }
        }
        return r;
    }

    private List<Map<String, Object>> mapear(List<Object[]> filas) {
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Object[] f : filas) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("etiqueta", String.valueOf(f[0]));
            m.put("cantidad", ((Number) f[1]).longValue());
            m.put("total", num(f[2]));
            lista.add(m);
        }
        return lista;
    }
}