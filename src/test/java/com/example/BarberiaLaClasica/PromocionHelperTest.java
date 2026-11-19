package com.example.BarberiaLaClasica;

import com.example.BarberiaLaClasica.model.Producto;
import com.example.BarberiaLaClasica.model.Promocion;
import com.example.BarberiaLaClasica.repository.PromocionRepository;
import com.example.BarberiaLaClasica.service.PromocionHelper;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PromocionHelperTest {

    @Test
    void productoSinPromocionMantienePrecioOriginal() {
        PromocionRepository repo = Mockito.mock(PromocionRepository.class);
        Mockito.when(repo.findPromocionesVigentes(Mockito.any(LocalDateTime.class)))
               .thenReturn(List.of());

        PromocionHelper helper = new PromocionHelper(repo);

        Producto p = new Producto();
        p.setId(1L);
        p.setPrecioVenta(50.0);

        assertEquals(50.0, helper.calcularPrecioProducto(p));
    }

    @Test
    void productoConPromocionAplicaDescuento() {
        PromocionRepository repo = Mockito.mock(PromocionRepository.class);

        Producto p = new Producto();
        p.setId(1L);
        p.setPrecioVenta(100.0);

        Promocion promo = new Promocion();
        promo.setTipoPromocion("PRODUCTO");
        promo.setProducto(p);
        promo.setPorcentajeDescuento(new BigDecimal("20"));

        Mockito.when(repo.findPromocionesVigentes(Mockito.any(LocalDateTime.class)))
               .thenReturn(List.of(promo));

        PromocionHelper helper = new PromocionHelper(repo);

        assertEquals(80.0, helper.calcularPrecioProducto(p));
    }
}