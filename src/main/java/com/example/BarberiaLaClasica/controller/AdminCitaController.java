package com.example.BarberiaLaClasica.controller;

import com.example.BarberiaLaClasica.service.CitaService;
import com.example.BarberiaLaClasica.service.PromocionHelper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@Controller
@RequestMapping("/admin/citas")
public class AdminCitaController {

    @Autowired
    private CitaService citaService;

    @Autowired
    private PromocionHelper promocionHelper;

    @GetMapping
    public String gestionCitas(Model model) {
        model.addAttribute("citasPendientes", citaService.listarPendientes());
        model.addAttribute("citasHoy", citaService.listarCitasDeHoy());
        model.addAttribute("promoHelper", promocionHelper);
        return "secretario/citas-gestion";
    }

    @PostMapping("/{id}/aceptar")
    @ResponseBody
    public ResponseEntity<Map<String, String>> aceptarCita(
            @PathVariable Long id,
            @RequestParam(name = "montoYape", defaultValue = "0") BigDecimal montoYape,
            @RequestParam(name = "montoEfectivo", defaultValue = "0") BigDecimal montoEfectivo,
            @RequestParam(name = "codigoYape", required = false) String codigoYape) {
        try {
            citaService.aceptarCitaHibridaCompleta(id, montoYape, montoEfectivo, codigoYape);
            return ResponseEntity.ok(Map.of("mensaje", "Cuenta auditada y confirmada con éxito."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/cancelar")
    @ResponseBody
    public ResponseEntity<Map<String, String>> cancelarCita(@PathVariable Long id) {
        try {
            citaService.cancelarCita(id);
            return ResponseEntity.ok(Map.of("mensaje", "Cita cancelada."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}