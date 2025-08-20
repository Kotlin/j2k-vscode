package org.springframework.samples.petclinic.vet

import java.util.List
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseBody

@Controller
class VetController(
    private val vetRepository: VetRepository
) {
    @GetMapping("/vets.html")
    fun showVetList(@RequestParam(defaultValue = "1") page: Int, model: Model): String {
        // Here we are returning an object of type 'Vets' rather than a collection of Vet
        // objects so it is simpler for Object-Xml mapping
        val vets = Vets()
        val paginated = findPaginated(page)
        vets.vetList.addAll(paginated.toList())
        return addPaginationModel(page, paginated, model)
    }

    private fun addPaginationModel(page: Int, paginated: Page<Vet>, model: Model): String {
        val listVets = paginated.getContent()
        model.addAttribute("currentPage", page)
        model.addAttribute("totalPages", paginated.getTotalPages())
        model.addAttribute("totalItems", paginated.getTotalElements())
        model.addAttribute("listVets", listVets)
        return "vets/vetList"
    }

    private fun findPaginated(page: Int): Page<Vet> {
        val pageSize = 5
        val pageable = PageRequest.of(page - 1, pageSize)
        return vetRepository.findAll(pageable)
    }

    @ResponseBody
    fun showResourcesVetList(): Vets {
        // Here we are returning an object of type 'Vets' rather than a collection of Vet
        // objects so it is simpler for JSon/Object mapping
        val vets = Vets()
        vets.vetLibrary.addAll(this.vetRepository.findAll())
        return vets
    }
}