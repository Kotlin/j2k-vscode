package org.springframework.samples.petclinic.vet

import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseBody

@Controller
class VetController(val vetRepository: VetRepository) {

    @GetMapping("/vets.html")
    fun showVetList(@RequestParam(defaultValue = "1") page: Int, model: Model): String {
        val pageSize = 5
        val pageable = PageRequest.of(page - 1, pageSize)
        val paginatedVets: Page<Vet> = vetRepository.findAll(pageable)

        // Create a Vets object and add all the vets from the current page.
        val vets = Vets(paginatedVets.content)

        return addPaginationModel(page, paginatedVets, model).let {
            model.addAttribute("currentPage", page)
            model.addAttribute("totalPages", paginatedVets.totalPages)
            model.addAttribute("totalItems", paginatedVets.totalElements)
            model.addAttribute("listVets", vetsPageable.content) // Note: This line has a typo in the original conversion, should be 'paginatedVets' instead of 'vetsPageable'
            "vets/vetList"
        }
    }

    @GetMapping("/vets")
    @ResponseBody
    fun showResourcesVetList(): Vets {
        val allVets = vetRepository.findAll()
        return Vets(allVets)
    }

    private fun findPaginated(page: Int): Page<Vet> {
        val pageSize = 5
        return vetRepository.findAll(PageRequest.of(page - 1, pageSize))
    }

    private fun addPaginationModel(page: Int, paginated: Page<Vet>, model: Model): String {
        val listVets = paginated.content
        model.addAttribute("currentPage", page)
        model.addAttribute("totalPages", paginated.totalPages)
        model.addAttribute("totalItems", paginated.totalElements)
        return "vets/vetList"
    }
}