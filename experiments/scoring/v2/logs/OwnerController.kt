package org.springframework.samples.petclinic.owner

import java.util.List
import java.util.Optional
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.WebDataBinder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.InitBinder
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.servlet.ModelAndView
import jakarta.validation.Valid
import org.springframework.web.bind.RedirectRequiredAttributes

@Controller
class OwnerController(
    val owners: OwnerRepository
) {
    @InitBinder
    fun setAllowedFields(dataBinder: WebDataBinder) {
        dataBinder.setDisallowedFields("id")
    }

    @ModelAttribute("owner")
    fun findOwner(@PathVariable(name = "ownerId", required = false) ownerId: Int?): Owner {
        return if (ownerId == null) {
            new Owner()
        } else {
            this.owners.findById(ownerId)
                .orElseThrow { IllegalArgumentException("Owner not found with id: ${ownerId}. Please ensure the ID is correct and the owner exists in the database.") }
        }
    }

    @GetMapping("/owners/new")
    fun initCreationForm(): String {
        return "redirect:/owners/new"
    }

    @PostMapping("/owners/new")
    fun processCreationForm(@Valid owner: Owner, result: BindingResult, redirectAttributes: RedirectAttributes): String {
        if (result.hasErrors()) {
            redirectAttributes.addFlashAttribute("error", "There was an error in creating the owner.")
            return "redirect:/owners/new"
        }

        this.owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "New Owner Created")
        return "redirect:/owners/${owner.id}"
    }

    @GetMapping("/owners/find")
    fun initFindForm(): String {
        return "owners/findOwners"
    }

    @GetMapping("/owners")
    fun processFindForm(@RequestParam(defaultValue = "1") page: Int, owner: Owner, result: BindingResult, model: Model): String {
        if (owner.lastName == null) {
            owner.lastName = ""
        }

        val ownersResults = findPaginatedForOwnersLastName(page, owner.lastName)
        if (ownersResults.isEmpty()) {
            result.rejectValue("lastName", "notFound", "not found")
            return "redirect:/owners/find"
        }

        if (ownersResults.totalElements == 1L) {
            val owner = ownersResults.iterator().next()
            model.addAttribute("owner", owner)
            return "redirect:/owners/${owner.id}"
        }

        addPaginationModel(page, model, ownersResults)
        return "owners/ownersList"
    }

    private fun findPaginatedForOwnersLastName(page: Int, lastname: String): Page<Owner> {
        val pageSize = 5
        val pageable = PageRequest.of(page - 1, pageSize)
        return owners.findByLastNameStartingWith(lastname, pageable)
    }

    private fun addPaginationModel(currentPage: Int, model: Model, paginated: Page<Owner>) {
        val listOwners = paginated.content
        model.addAttribute("currentPage", currentPage)
        model.addAttribute("totalPages", paginated.totalPages)
        model.addAttribute("totalItems", paginated.totalElements)
        model.addAttribute("listOwners", listOwners)
    }

    @GetMapping("/owners/{ownerId}/edit")
    fun initUpdateOwnerForm(): String {
        return "redirect:/owners/edit"
    }

    @PostMapping("/owners/{ownerId}/edit")
    fun processUpdateOwnerForm(@Valid owner: Owner, result: BindingResult, @PathVariable ownerId: Int, redirectAttributes: RedirectAttributes): String {
        if (result.hasErrors()) {
            redirectAttributes.addFlashAttribute("error", "There was an error in updating the owner.")
            return VIEWS_OWNER_CREATE_OR_UPDATE_FORM
        }

        if (owner.id != ownerId) {
            result.rejectValue("id", "mismatch", "The owner ID in the form does not match the URL.")
            redirectAttributes.addFlashAttribute("message", "Owner Values Updated")
            return "redirect:/owners/${ownerId}/edit"
        }

        this.owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "Owner Values Updated")
        return "redirect:/owners/${ownerId}"
    }

    companion object {
        const val VIEWS_OWNER_CREATE_OR_UPDATE_FORM = "org.springframework.samples.petclinic.owner.VIEWS_OWNER_CREATE_OR_UPDATE_FORM"
    }
}