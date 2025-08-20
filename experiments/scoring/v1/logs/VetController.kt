package org.springframework.samples.petclinic.vet

import java.util.List
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseBody

@Controller
class VetController(private val vetRepository: VetRepository) {

    @GetMapping("/vets.html")
    fun showVetList(@RequestParam(defaultValue = "1") page: Int, model: Model): String {
        val vets = Vets()
        val paginated: Page<Vet> = findPaginated(page)
        vets.vetList.addAll(paginated.toList())
        return addPaginationModel(page, paginated, model)
    }

    private fun addPaginationModel(page: Int, paginated: Page<Vet>, model: Model): String {
        val listVets: List<Vet> = paginated.content
        model.addAttribute("currentPage", page)
        model.addAttribute("totalPages", paginated.totalPages)
        model.addAttribute("totalItems", paginated.totalElements)
        model.addAttribute("listVets", listVets)
        return "vets/vetList"
    }

    private fun findPaginated(page: Int): Page<Vet> {
        val pageSize = 5
        val pageable: Pageable = PageRequest.of(page - 1, pageSize)
        return vetRepository.findAll(pageable)
    }

    @GetMapping("/vets")
    @ResponseBody
    fun showResourcesVetList(): Vets {
        val vets = Vets()
        vets.vetList.addAll(vetRepository.findAll())
        return vets
    }
}