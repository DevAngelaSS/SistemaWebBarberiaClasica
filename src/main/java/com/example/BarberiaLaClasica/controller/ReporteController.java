package com.example.BarberiaLaClasica.controller;

import com.example.BarberiaLaClasica.service.ReporteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/admin/reportes")
public class ReporteController {

    @Autowired
    private ReporteService reporteService;

    @GetMapping
    public String verReportes(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            Model model) {

        if (hasta == null) hasta = LocalDate.now();
        if (desde == null) desde = hasta.withDayOfMonth(1);
        if (desde.isAfter(hasta)) {
            LocalDate tmp = desde;
            desde = hasta;
            hasta = tmp;
        }

        List<Map<String, Object>> porDia = reporteService.porDia(desde, hasta);

        model.addAttribute("desde", desde);
        model.addAttribute("hasta", hasta);
        model.addAttribute("resumen", reporteService.resumen(desde, hasta));
        model.addAttribute("porDia", porDia);
        model.addAttribute("porBarbero", reporteService.porBarbero(desde, hasta));
        model.addAttribute("porServicio", reporteService.porServicio(desde, hasta));
        model.addAttribute("porEstado", reporteService.citasPorEstado(desde, hasta));

        // Datos para el gráfico
        model.addAttribute("labelsDia", porDia.stream()
                .map(m -> (String) m.get("etiqueta")).collect(Collectors.toList()));
        model.addAttribute("valoresDia", porDia.stream()
                .map(m -> (Double) m.get("total")).collect(Collectors.toList()));

        return "reportes/reportes";
    }
}